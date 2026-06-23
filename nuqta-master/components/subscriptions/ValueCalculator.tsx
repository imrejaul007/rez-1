/**
 * ValueCalculator - Displays estimated savings for a selected subscription tier.
 * Fetches value proposition data from the API and renders a 2x2 stat grid.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import subscriptionApi from '@/services/subscriptionApi';
import type { SubscriptionTier, ValueProposition } from '@/services/subscriptionApi';
import PaybackProgressBar from './PaybackProgressBar';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ValueCalculatorProps {
  selectedTier: SubscriptionTier | null;
  currencySymbol: string;
  isAuthenticated: boolean;
  selectedCycle?: 'monthly' | 'yearly';
}

function ValueCalculator({ selectedTier, currencySymbol, isAuthenticated, selectedCycle }: ValueCalculatorProps) {
  const [data, setData] = useState<ValueProposition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isMounted = useIsMounted();

  const fetchValue = useCallback(async (tierName: string) => {
    if (!isAuthenticated) return;
    if (tierName === 'free') return;

    setLoading(true);
    setError(false);
    try {
      const result = await subscriptionApi.getValueProposition(tierName as 'premium' | 'vip');
      if (!isMounted()) return;
      setData(result);
    } catch {
      setError(true);
      setData(null);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedTier || selectedTier.tier === 'free') {
      setData(null);
      return;
    }
    fetchValue(selectedTier.tier);
  }, [selectedTier?.tier, fetchValue]);

  // Don't render for free tier or no selection
  if (!selectedTier || selectedTier.tier === 'free') return null;

  // Not authenticated prompt
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Estimated Savings</Text>
        <View style={styles.card}>
          <View style={styles.signInPrompt}>
            <Ionicons name="lock-closed-outline" size={24} color="#6B7280" />
            <Text style={styles.signInText}>Sign in to see your personalized savings</Text>
          </View>
        </View>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Estimated Savings</Text>
        <View style={styles.card}>
          <ActivityIndicator size="small" color={Colors.gold} style={styles.spinner} />
        </View>
      </View>
    );
  }

  // Error
  if (error || !data) {
    return null;
  }

  const topBenefit = data.benefits?.[0] || 'Premium perks';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Estimated Savings</Text>
      <View style={styles.card}>
        <View style={styles.grid}>
          {/* Monthly Savings */}
          <View style={styles.statBox}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.success} />
            <Text style={styles.statValue}>
              {currencySymbol}{data.estimatedMonthlySavings.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Monthly Savings</Text>
          </View>

          {/* Yearly Savings */}
          <View style={styles.statBox}>
            <Ionicons name="calendar-outline" size={20} color={Colors.gold} />
            <Text style={styles.statValue}>
              {currencySymbol}{data.estimatedYearlySavings.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Yearly Savings</Text>
          </View>

          {/* Payback Period */}
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={20} color="#7C3AED" />
            <Text style={styles.statValue}>
              {data.paybackPeriod} days
            </Text>
            <Text style={styles.statLabel}>Payback Period</Text>
          </View>

          {/* Top Benefit */}
          <View style={styles.statBox}>
            <Ionicons name="star-outline" size={20} color={Colors.gold} />
            <Text style={styles.statValue} numberOfLines={2}>
              {topBenefit}
            </Text>
            <Text style={styles.statLabel}>Top Benefit</Text>
          </View>
        </View>
      </View>

      {/* Payback Progress Bar */}
      {data && selectedTier && (
        <PaybackProgressBar
          subscriptionCost={selectedTier.pricing?.[selectedCycle || 'monthly'] ?? 0}
          estimatedMonthlySavings={data.estimatedMonthlySavings ?? 0}
          currencySymbol={currencySymbol}
        />
      )}
    </View>
  );
}

export default React.memo(ValueCalculator);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: Spacing.base,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  signInPrompt: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  signInText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  spinner: {
    paddingVertical: Spacing.lg,
  },
});
