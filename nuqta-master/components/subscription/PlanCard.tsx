// Plan Card Component
// Displays individual subscription plan with pricing, features, and CTA button

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { TIER_COLORS, TIER_GRADIENTS, SubscriptionTier, BillingCycle } from '@/types/subscription.types';
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
  SUBSCRIPTION_SHADOW,
} from '@/styles/subscriptionStyles';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface PlanCardProps {
  tier: SubscriptionTier;
  name: string;
  price: number;
  yearlyPrice: number;
  icon: string;
  features: string[];
  isCurrentPlan: boolean;
  isMostPopular?: boolean;
  onSubscribe: () => void;
  discount?: number;
  billingCycle: BillingCycle;
  isLoading?: boolean;
  disabled?: boolean;
}

function PlanCard({
  tier,
  name,
  price,
  yearlyPrice,
  icon,
  features,
  isCurrentPlan,
  isMostPopular = false,
  onSubscribe,
  discount = 0,
  billingCycle,
  isLoading = false,
  disabled = false,
}: PlanCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const tierColor = TIER_COLORS[tier];
  const tierGradient = TIER_GRADIENTS[tier];
  const displayPrice = billingCycle === 'monthly' ? price : Math.floor(yearlyPrice / 12);
  const savingsPercentage = yearlyPrice > 0
    ? Math.round(((price * 12 - yearlyPrice) / (price * 12)) * 100)
    : 0;

  const renderFeature = (feature: string) => (
    <View style={styles.featureRow} key={feature}>
      <Ionicons
        name="checkmark-circle"
        size={20}
        color={SUBSCRIPTION_COLORS.success}
      />
      <ThemedText style={styles.featureText}>{feature}</ThemedText>
    </View>
  );

  const renderButton = () => {
    if (tier === 'free') {
      return (
        <View style={styles.freeButton}>
          <ThemedText style={styles.freeButtonText}>Current Plan</ThemedText>
        </View>
      );
    }

    if (isCurrentPlan) {
      return (
        <View style={styles.currentButton}>
          <ThemedText style={styles.currentButtonText}>Active</ThemedText>
        </View>
      );
    }

    return (
      <Pressable
        style={[styles.upgradeButton, { backgroundColor: tierColor }]}
        onPress={onSubscribe}
        disabled={isLoading || disabled}
      >
        {isLoading ? (
          <ActivityIndicator color={SUBSCRIPTION_COLORS.white} />
        ) : (
          <>
            <ThemedText style={styles.upgradeButtonText}>
              {tier === 'premium' || tier === 'vip' ? 'Upgrade Now' : 'Downgrade'}
            </ThemedText>
            <Ionicons name="arrow-forward" size={20} color={SUBSCRIPTION_COLORS.white} />
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.planCard}>
      {isMostPopular && (
        <View style={styles.popularBadge}>
          <ThemedText style={styles.popularText}>MOST POPULAR</ThemedText>
        </View>
      )}

      <LinearGradient colors={tierGradient as any} style={styles.planHeader}>
        <Ionicons name={icon as any} size={40} color={SUBSCRIPTION_COLORS.white} />
        <ThemedText style={styles.planName}>{name}</ThemedText>
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.background.primary} />
            <ThemedText style={styles.currentBadgeText}>Current Plan</ThemedText>
          </View>
        )}
      </LinearGradient>

      <View style={styles.planBody}>
        <View style={styles.priceContainer}>
          <ThemedText style={styles.currency}>{currencySymbol}</ThemedText>
          <ThemedText style={styles.price}>{displayPrice}</ThemedText>
          <ThemedText style={styles.period}>/month</ThemedText>
        </View>

        {billingCycle === 'yearly' && yearlyPrice > 0 && (
          <ThemedText style={styles.yearlyNote}>
            Billed annually at {currencySymbol}{yearlyPrice} (Save {savingsPercentage}%)
          </ThemedText>
        )}

        {discount > 0 && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{discount}% OFF</ThemedText>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {features.map(renderFeature)}
        </View>

        {renderButton()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    marginBottom: SUBSCRIPTION_SPACING.xl,
    overflow: 'hidden',
    ...SUBSCRIPTION_SHADOW.medium,
  },
  popularBadge: {
    backgroundColor: SUBSCRIPTION_COLORS.amber,
    paddingVertical: SUBSCRIPTION_SPACING.md,
    alignItems: 'center',
  },
  popularText: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    padding: SUBSCRIPTION_SPACING.xxl,
    alignItems: 'center',
  },
  planName: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SUBSCRIPTION_SPACING.md,
  },
  currentBadge: {
    marginTop: SUBSCRIPTION_SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  currentBadgeText: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planBody: {
    padding: SUBSCRIPTION_SPACING.xxl,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: SUBSCRIPTION_SPACING.md,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
    marginTop: SUBSCRIPTION_SPACING.md,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
  },
  period: {
    fontSize: 16,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginTop: 20,
  },
  yearlyNote: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.success,
    textAlign: 'center',
    marginBottom: SUBSCRIPTION_SPACING.lg,
  },
  discountBadge: {
    backgroundColor: colors.successScale[100],
    paddingVertical: SUBSCRIPTION_SPACING.xs,
    paddingHorizontal: SUBSCRIPTION_SPACING.md,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.sm,
    alignItems: 'center',
    marginBottom: SUBSCRIPTION_SPACING.lg,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.success,
  },
  featuresContainer: {
    marginVertical: SUBSCRIPTION_SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SUBSCRIPTION_SPACING.lg,
  },
  featureText: {
    fontSize: 14,
    color: SUBSCRIPTION_COLORS.text,
    marginLeft: SUBSCRIPTION_SPACING.md,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    gap: SUBSCRIPTION_SPACING.md,
  },
  upgradeButtonText: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentButton: {
    backgroundColor: SUBSCRIPTION_COLORS.border,
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    alignItems: 'center',
  },
  currentButtonText: {
    color: SUBSCRIPTION_COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  freeButton: {
    backgroundColor: colors.neutral[100],
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    alignItems: 'center',
  },
  freeButtonText: {
    color: SUBSCRIPTION_COLORS.grayLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(PlanCard);
