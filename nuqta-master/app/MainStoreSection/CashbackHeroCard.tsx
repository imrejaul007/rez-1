import { withErrorBoundary } from '@/utils/withErrorBoundary';
// CashbackHeroCard.tsx - Green gradient cashback display card
import React from "react";
import { View, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  Spacing,
  BorderRadius,
} from "@/constants/DesignSystem";
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';

export interface CashbackHeroCardProps {
  cashbackPercentage?: number;
  coinsToEarn?: number;
  savingsAmount?: number;
}

function CashbackHeroCard({
  cashbackPercentage = 20,
  coinsToEarn = 50,
  savingsAmount,
}: CashbackHeroCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.lightMustard, colors.brand.goldRich]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Cashback Info */}
          <View style={styles.textContent}>
            {savingsAmount != null && savingsAmount > 0 ? (
              <>
                <ThemedText style={styles.label}>You save</ThemedText>
                <ThemedText style={styles.savingsHero}>{currencySymbol}{savingsAmount.toLocaleString('en-IN')}</ThemedText>
                <ThemedText style={styles.percentageSecondary}>{cashbackPercentage}% Cashback</ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.label}>Save up to</ThemedText>
                <ThemedText style={styles.savingsHero}>~{currencySymbol}{Math.round((cashbackPercentage / 100) * 1000).toLocaleString('en-IN')}</ThemedText>
                <ThemedText style={styles.percentageSecondary}>on {currencySymbol}1,000 spend ({cashbackPercentage}% Cashback)</ThemedText>
              </>
            )}
            <View style={styles.coinsRow}>
              <View style={styles.divider} />
              <ThemedText style={styles.plus}>+</ThemedText>
              <View style={styles.divider} />
            </View>
            <View style={styles.coinsContainer}>
              <CachedImage
                source={BRAND.COIN_IMAGE}
                style={styles.coinIcon}
                contentFit="contain"
              />
              <ThemedText style={styles.coinsText}>
                Get {coinsToEarn} {BRAND.COIN_NAME} today
              </ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  gradient: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  textContent: {
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: 4,
  },
  savingsHero: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.background.primary,
    marginBottom: 2,
  },
  percentageSecondary: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  percentage: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.background.primary,
    letterSpacing: -0.5,
  },
  coinsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  plus: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  coinIcon: {
    width: 24,
    height: 24,
  },
  coinsText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.background.primary,
  },
});

export default withErrorBoundary(CashbackHeroCard, 'MainStoreSectionCashbackHeroCard');
