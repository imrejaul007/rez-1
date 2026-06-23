// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Subscription Benefits Page
// Showcase all benefits and usage tips for current subscription tier

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { TIER_COLORS, TIER_GRADIENTS, TIER_NAMES } from '@/types/subscription.types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

function BenefitsPage() {
  const router = useRouter();
  const { state, computed } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const currentTier = state.currentSubscription?.tier || 'free';
  const tierColor = TIER_COLORS[currentTier];
  const tierGradient = TIER_GRADIENTS[currentTier];

  const benefits = [
    {
      icon: 'cash',
      title: `${currentTier === 'vip' ? '3x' : currentTier === 'premium' ? '2x' : '1x'} Cashback`,
      description: 'Earn more rewards on every purchase',
      tip: 'Stack with store offers for maximum savings',
      color: Colors.success,
    },
    {
      icon: 'bicycle',
      title: currentTier === 'vip' ? 'Free Delivery (All Orders)' : 'Free Delivery',
      description: currentTier === 'vip' ? 'No minimum order value' : `On orders above ${currencySymbol}500`,
      tip: `Save an average of ${currencySymbol}50-100 per order`,
      color: Colors.info,
    },
    {
      icon: 'headset',
      title: currentTier !== 'free' ? 'Priority Support' : 'Email Support',
      description: currentTier !== 'free' ? '24/7 dedicated support team' : 'Response within 48 hours',
      tip: 'Get instant help via chat or phone',
      color: Colors.brand.purpleLight,
    },
    {
      icon: 'pricetag',
      title: 'Exclusive Deals',
      description: currentTier !== 'free' ? 'Access to member-only deals' : 'Limited deals',
      tip: 'Check the Offers section daily for new deals',
      color: Colors.warning,
    },
  ];

  if (currentTier === 'vip') {
    benefits.push(
      {
        icon: 'person',
        title: 'Personal Shopper',
        description: 'Dedicated assistant for your shopping needs',
        tip: 'Book appointments via the profile section',
        color: colors.brand.pink,
      },
      {
        icon: 'calendar',
        title: 'Premium Events',
        description: 'Exclusive access to VIP shopping events',
        tip: 'Get early access to sales and product launches',
        color: colors.brand.indigo,
      }
    );
  }

  const usageTips = [
    {
      title: 'Shop regularly to maximize savings',
      description: 'Your cashback multiplier applies to every purchase',
    },
    {
      title: 'Combine offers for best value',
      description: 'Stack your membership benefits with store promotions',
    },
    {
      title: 'Use wishlists strategically',
      description: 'Get notified when items go on sale',
    },
    {
      title: 'Refer friends to earn more',
      description: 'Get bonus cashback for every successful referral',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={tierColor} />

      {/* Header */}
      <LinearGradient colors={tierGradient as any} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Your Benefits</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Current Tier Badge */}
        <View style={styles.tierBadgeContainer}>
          <LinearGradient colors={tierGradient as any} style={styles.tierBadge}>
            <Ionicons
              name={currentTier === 'vip' ? 'diamond' : currentTier === 'premium' ? 'star' : 'person-outline'}
              size={32}
              color={Colors.text.inverse}
            />
            <ThemedText style={styles.tierBadgeText}>{TIER_NAMES[currentTier]} Member</ThemedText>
          </LinearGradient>
        </View>

        {/* Savings Summary */}
        {currentTier !== 'free' && state.currentSubscription?.usage && (
          <View style={styles.savingsCard}>
            <ThemedText style={styles.savingsTitle}>Your Total Savings</ThemedText>
            <ThemedText style={styles.savingsAmount}>{currencySymbol}{state.currentSubscription.usage.totalSavings || 0}</ThemedText>
            <ThemedText style={styles.savingsSubtitle}>
              {state.currentSubscription.usage.ordersAllTime || 0} orders with subscription benefits
            </ThemedText>
          </View>
        )}

        {/* Benefits List */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Your Active Benefits</ThemedText>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={[styles.benefitIconContainer, { backgroundColor: `${benefit.color}20` }]}>
                <Ionicons name={benefit.icon as any} size={28} color={benefit.color} />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
                <ThemedText style={styles.benefitDescription}>{benefit.description}</ThemedText>
                <View style={styles.benefitTip}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
                  <ThemedText style={styles.benefitTipText}>{benefit.tip}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Usage Tips */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Tips to Maximize Your Savings</ThemedText>
          {usageTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipNumber}>
                <ThemedText style={styles.tipNumberText}>{index + 1}</ThemedText>
              </View>
              <View style={styles.tipContent}>
                <ThemedText style={styles.tipTitle}>{tip.title}</ThemedText>
                <ThemedText style={styles.tipDescription}>{tip.description}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Upgrade CTA */}
        {currentTier !== 'vip' && (
          <View style={styles.upgradeSection}>
            <ThemedText style={styles.upgradeSectionTitle}>Want Even More Benefits?</ThemedText>
            <Pressable
              style={styles.upgradeButton}
              onPress={() => router.push('/subscription/plans')}
            >
              <LinearGradient colors={[Colors.warning, colors.warningScale[700]]} style={styles.upgradeButtonGradient}>
                <ThemedText style={styles.upgradeButtonText}>
                  {currentTier === 'free' ? 'Upgrade to Premium' : 'Upgrade to VIP'}
                </ThemedText>
                <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
              </LinearGradient>
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
  tierBadgeContainer: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tierBadgeText: {
    color: Colors.text.inverse,
    ...Typography.h2,
    fontWeight: 'bold',
  },
  savingsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  savingsTitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  savingsAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  savingsSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.brand.purpleLight,
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
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  benefitDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  benefitTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: Spacing.xs,
  },
  benefitTipText: {
    ...Typography.bodySmall,
    color: colors.brand.amberDark,
    fontWeight: '500',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tipNumberText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  tipDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  upgradeSection: {
    margin: Spacing.lg,
    marginBottom: 40,
    alignItems: 'center',
  },
  upgradeSectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  upgradeButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  upgradeButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
});

export default withErrorBoundary(BenefitsPage, 'SubscriptionBenefits');
