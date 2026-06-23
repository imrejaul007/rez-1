/**
 * PriveBenefitsGrid - Dynamic benefits list
 * Replaces static PriveHowItWorks with real tier benefits data.
 * Supports `condensed` prop for dashboard summary view.
 */

import { colors } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

interface TierBenefitData {
  tier: string;
  displayName: string;
  color: string;
  coinMultiplier: number;
  conciergeAccess: boolean;
  benefits: string[];
  isCurrent?: boolean;
}

interface PriveBenefitsGridProps {
  condensed?: boolean;
  currentTier?: string;
  tiers?: TierBenefitData[];
}

const TIER_ICONS: Record<string, string> = {
  entry: '◆',
  signature: '◇',
  elite: '✦',
};

const DEFAULT_TIERS: TierBenefitData[] = [
  { tier: 'entry', displayName: 'Entry', color: '#CD7F32', coinMultiplier: 1.0, conciergeAccess: false, benefits: ['Earn coins on every order', 'Access exclusive offers', 'Daily check-in bonus'] },
  { tier: 'signature', displayName: 'Signature', color: '#C0C0C0', coinMultiplier: 1.5, conciergeAccess: true, benefits: ['1.5x coin multiplier', '24/7 Concierge access', 'Priority offers', 'Analytics dashboard'] },
  { tier: 'elite', displayName: 'Elite', color: colors.brand.goldBright, coinMultiplier: 2.0, conciergeAccess: true, benefits: ['2x coin multiplier', '1-hour concierge SLA', 'Exclusive elite events', 'All platform benefits'] },
];

export const PriveBenefitsGrid: React.FC<PriveBenefitsGridProps> = ({
  condensed = false,
  currentTier = 'entry',
  tiers,
}) => {
  const router = useRouter();
  const displayTiers = tiers?.length ? tiers : DEFAULT_TIERS;

  // In condensed mode, show current tier + next tier
  const tiersToShow = condensed
    ? displayTiers.filter(t => t.tier === currentTier || t.isCurrent || isNextTier(t.tier, currentTier, displayTiers))
    : displayTiers;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>
        {condensed ? 'YOUR BENEFITS' : 'TIER BENEFITS'}
      </Text>

      {tiersToShow.map((tier) => {
        const isCurrent = tier.tier === currentTier || tier.isCurrent;
        const isLocked = !isCurrent && getTierRank(tier.tier) > getTierRank(currentTier);

        return (
          <Pressable
            key={tier.tier}
            style={[
              styles.tierCard,
              isCurrent && styles.tierCardCurrent,
              isLocked && styles.tierCardLocked,
            ]}
            onPress={() => router.push('/prive/tier-comparison' as any)}
           
          >
            <View style={styles.tierHeader}>
              <View style={[styles.tierIcon, { backgroundColor: (tier.color || PRIVE_COLORS.gold.primary) + '22' }]}>
                <Text style={[styles.tierIconText, { color: tier.color || PRIVE_COLORS.gold.primary }]}>
                  {TIER_ICONS[tier.tier] || '◆'}
                </Text>
              </View>
              <View style={styles.tierInfo}>
                <Text style={[styles.tierName, { color: tier.color || PRIVE_COLORS.text.primary }]}>
                  {tier.displayName}
                </Text>
                <Text style={styles.tierMultiplier}>{tier.coinMultiplier}x coins</Text>
              </View>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
              {isLocked && (
                <Text style={styles.lockIcon}>🔒</Text>
              )}
            </View>

            {(!condensed || isCurrent) && tier.benefits?.length > 0 && (
              <View style={styles.benefitsList}>
                {tier.benefits.slice(0, condensed ? 3 : 5).map((benefit, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <Text style={[styles.benefitCheck, { color: isCurrent ? colors.brand.emerald : PRIVE_COLORS.text.tertiary }]}>
                      {isCurrent ? '✓' : '○'}
                    </Text>
                    <Text style={[styles.benefitText, isLocked && styles.benefitTextLocked]}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}

      {condensed && (
        <Pressable
          style={styles.viewAllBtn}
          onPress={() => router.push('/prive/benefits' as any)}
         
        >
          <Text style={styles.viewAllText}>View All Benefits →</Text>
        </Pressable>
      )}
    </View>
  );
};

function getTierRank(tier: string): number {
  const ranks: Record<string, number> = { none: 0, entry: 1, signature: 2, elite: 3 };
  return ranks[tier] || 0;
}

function isNextTier(tier: string, currentTier: string, tiers: TierBenefitData[]): boolean {
  const currentRank = getTierRank(currentTier);
  const tierRank = getTierRank(tier);
  return tierRank === currentRank + 1;
}

const styles = StyleSheet.create({
  section: {
    marginTop: PRIVE_SPACING.xxl,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  sectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: PRIVE_SPACING.lg,
  },
  tierCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.md,
  },
  tierCardCurrent: {
    borderColor: PRIVE_COLORS.gold.primary,
    borderWidth: 1.5,
  },
  tierCardLocked: {
    opacity: 0.6,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  tierInfo: {
    flex: 1,
    gap: 2,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600',
  },
  tierMultiplier: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  currentBadge: {
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.xs,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderRadius: PRIVE_RADIUS.sm,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  lockIcon: {
    fontSize: 16,
  },
  benefitsList: {
    marginTop: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
  },
  benefitCheck: {
    fontSize: 13,
    fontWeight: '600',
    width: 18,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    flex: 1,
  },
  benefitTextLocked: {
    color: PRIVE_COLORS.text.tertiary,
  },
  viewAllBtn: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.md,
  },
  viewAllText: {
    fontSize: 13,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '500',
  },
});

export default React.memo(PriveBenefitsGrid);
